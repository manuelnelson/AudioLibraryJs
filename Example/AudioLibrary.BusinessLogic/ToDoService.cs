using System;
using AudioLibrary.BusinessLogic.Contracts;
using AudioLibrary.DataInterface;
using AudioLibrary.Models;
using Elmah;

namespace AudioLibrary.BusinessLogic
{
    public class ToDoService : Service<IToDoRepository, ToDo>, IToDoService
    {
        public ToDoService(IToDoRepository repository) : base(repository)
        {
            ToDoRepository = repository;
        }

        private IToDoRepository ToDoRepository { get; set; }

        public object GetRecent()
        {
            try
            {
                return ToDoRepository.GetRecent();
            }
            catch (Exception ex)
            {
                ErrorSignal.FromCurrentContext().Raise(ex);
                throw new Exception("Unable to get latest To-dos", ex);
            }
        }
    }
}