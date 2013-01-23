using AudioLibrary.DataInterface;
using AudioLibrary.Models;

namespace AudioLibrary.BusinessLogic.Contracts
{
    public interface IToDoService : IService<IToDoRepository, ToDo>
    {
        object GetRecent();
    }
}