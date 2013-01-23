using AudioLibrary.BusinessLogic.Contracts;
using AudioLibrary.DataContext.Repositories;
using AudioLibrary.DataInterface;
using AudioLibrary.Models;

namespace AudioLibrary.BusinessLogic
{
    public class TestService : Service<TestRepository, Test>, ITestService
    {
        public TestService(TestRepository repository) : base(repository)
        {
            TestRepository = repository;
        }

        private ITestRepository TestRepository { get; set; }
    }
}