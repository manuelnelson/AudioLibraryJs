using AudioLibrary.DataInterface;
using AudioLibrary.Models;

namespace AudioLibrary.BusinessLogic.Contracts
{
    public interface ITestService : IService<ITestRepository, Test>
    {
    }
}